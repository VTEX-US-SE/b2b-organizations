import type { FunctionComponent } from 'react'
import React, { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'react-apollo'
import {
  Layout,
  PageHeader,
  Button,
  IconCheck,
  Tabs,
  Tab,
  Spinner,
  PageBlock,
  Alert,
} from 'vtex.styleguide'
import { useToast } from '@vtex/admin-ui'
import { useIntl, FormattedMessage } from 'react-intl'
import { useRuntime } from 'vtex.render-runtime'
import { HashRouter, Route, Switch } from 'react-router-dom'
import unionBy from 'lodash/unionBy'

import { organizationMessages as messages , costCenterMessages as ccMessages,} from './utils/messages'
import GET_ORGANIZATION from '../graphql/getOrganization.graphql'
import UPDATE_ORGANIZATION from '../graphql/updateOrganization.graphql'
import UPDATE_COST_CENTER from '../graphql/updateCostCenter.graphql'
import GET_B2B_CUSTOM_FIELDS from '../graphql/getB2BCustomFields.graphql'
import GET_COST_CENTER from '../graphql/getCostCenter.graphql'
import OrganizationDetailsCostCenters from './OrganizationDetails/OrganizationDetailsCostCenters'
import type { Collection } from './OrganizationDetails/OrganizationDetailsCollections'
import OrganizationDetailsCollections from './OrganizationDetails/OrganizationDetailsCollections'
import type { PaymentTerm } from './OrganizationDetails/OrganizationDetailsPayTerms'
import OrganizationDetailsPayTerms from './OrganizationDetails/OrganizationDetailsPayTerms'
import type { PriceTable } from './OrganizationDetails/OrganizationDetailsPriceTables'
import OrganizationDetailsPriceTables from './OrganizationDetails/OrganizationDetailsPriceTables'
import OrganizationDetailsSalesChannel from './OrganizationDetails/OrganizationDetailsSalesChannel'
import OrganizationDetailsUsers from './OrganizationDetails/OrganizationDetailsUsers'
import OrganizationDetailsDefault from './OrganizationDetails/OrganizationDetailsDefault'
import useHashRouter from './OrganizationDetails/useHashRouter'
import type { Seller } from './OrganizationDetails/OrganizationDetailsSellers'
import OrganizationDetailsSellers from './OrganizationDetails/OrganizationDetailsSellers'
import type { PermissionsOptions } from './OrganizationDetails/OrganizationDetailsSettings'
import OrganizationDetailsSettings from './OrganizationDetails/OrganizationDetailsSettings'

export interface CellRendererProps<RowType> {
  cellData: unknown
  rowData: RowType
  updateCellMeasurements: () => void
}

interface SelectedOrgCostCenterDetails {
  id: string
  orgId: string
  costId: string
  name: string
}

export type AvailabilityTypes =
  | 'availablePriceTables'
  | 'availableCollections'
  | 'availablePayments'
  | 'availableSellers'

const SESSION_STORAGE_KEY = 'organization-details-tab'

// combines defaultCustomFields and customFields input from the organization data to fill input fields
export const joinById = (
  fields: CustomField[],
  defaultFields: CustomFieldSetting[]
): CustomField[] => {
  return unionBy(fields, defaultFields, 'name')
}

const OrganizationDetails: FunctionComponent = () => {
  /**
   * Hooks
   */
  const { formatMessage } = useIntl()
  const {
    route: { params },
    navigate,
  } = useRuntime()

  const showToast = useToast()

  /**
   * States
   */

  const [organizationNameState, setOrganizationNameState] = useState('')
  const [organizationTradeNameState, setOrganizationTradeNameState] = useState(
    ''
  )

  const [statusState, setStatusState] = useState('')
  const [collectionsState, setCollectionsState] = useState([] as Collection[])
  const [priceTablesState, setPriceTablesState] = useState([] as string[])
  const [salesChannelState, setSalesChannelState] = useState('')
  const [sellersState, setSellersState] = useState([] as Seller[])
  const [orgCostCenterState, setOrgCostCenterState] = useState({} as SelectedOrgCostCenterDetails)
  const [errorState, setErrorState] = useState('')
  const [paymentTermsState, setPaymentTermsState] = useState(
    [] as PaymentTerm[]
  )

  const [permissionsOptions, setPermissionsOptions] = useState(
    [] as PermissionsOptions[]
  )

  // const routerRef = useRef(null as any)

  const [loadingState, setLoadingState] = useState(false)

  const [customFieldsState, setCustomFieldsState] = useState<CustomField[]>([])

  const isOrganizationView = !Object.keys(orgCostCenterState).length || orgCostCenterState?.id === params?.id

  /**
   * Queries
   */
  const { data, loading, refetch } = useQuery(GET_ORGANIZATION, {
    variables: { id: params?.id },
    skip: !params?.id,
    ssr: false,
    onCompleted(insideData) {
      if (!insideData?.getOrganizationById?.permissions) {
        return
      }

      const permissionsArray = Object.entries(
        insideData.getOrganizationById.permissions
      ).filter(key => {
        return !(key[0] === '__typename')
      })

      setPermissionsOptions(() => {
        return permissionsArray.map(p => ({
          label: p[0],
          value: p[1] as boolean,
        }))
      })
    },
  })

  const { data: defaultCustomFieldsData } = useQuery(GET_B2B_CUSTOM_FIELDS, {
    variables: { id: params?.id },
    skip: !params?.id,
    ssr: false,
  })

  const { data:costCenterData } = useQuery(GET_COST_CENTER, {
    variables: { id: orgCostCenterState?.id },
    skip: !orgCostCenterState?.id,
    ssr: false,
  })

  /**
   * Mutations
   */
  const [updateOrganization] = useMutation(UPDATE_ORGANIZATION)
  const [updateCostCenter] = useMutation(UPDATE_COST_CENTER)

  /**
   * Functions
   */

  const manageOrgCostCenterUpdate= () => {
    if(isOrganizationView){
      handleUpdateOrganization()

    }else{
      //update organization unit
      handleUpdateCostCenter()
    }
  }

    const handleUpdateCostCenter = () => {
      const costCenterDetails = costCenterData?.getCostCenterById;
      setLoadingState(true)
      const collections = collectionsState.map(collection => {
        return { name: collection.name, id: collection.collectionId }
      })

      costCenterDetails?.addresses.sort((item:any) => (item.checked ? -1 : 1))
      const variables = {
        id: orgCostCenterState?.id,
        input: {
          name: costCenterDetails?.name,
          addresses: costCenterDetails?.addresses.map((item:any) => {
            delete item.checked

            return item
          }),
          collections,
          phoneNumber:costCenterDetails?.phoneNumber,
          businessDocument:costCenterDetails?.businessDocument,
        },
      }

      updateCostCenter({ variables })
        .then(() => {
          showToast({
            variant: 'positive',
            message: formatMessage(ccMessages.toastUpdateSuccess),
          })
          refetch({ id: params?.id })
          setLoadingState(false)
        })
        .catch(error => {
          console.error(error)
          showToast({
            variant: 'critical',
            message: formatMessage(ccMessages.toastUpdateFailure),
          })
          setLoadingState(false)
        })
    }

  const handleUpdateOrganization = () => {
    setErrorState('')

    if (!organizationNameState || organizationNameState.trim().length === 0) {
      setErrorState(formatMessage(messages.organizationNameRequired))

      return
    }

    setLoadingState(true)

    const collections = collectionsState.map(collection => {
      return { name: collection.name, id: collection.collectionId }
    })

    const paymentTerms = paymentTermsState.map(paymentTerm => {
      return { name: paymentTerm.name, id: paymentTerm.paymentTermId }
    })

    const variables = {
      id: params?.id,
      name: organizationNameState,
      tradeName: organizationTradeNameState,
      status: statusState,
      collections,
      paymentTerms,
      priceTables: priceTablesState,
      customFields: customFieldsState,
      salesChannel: salesChannelState === '' ? null : salesChannelState,
      sellers: sellersState?.map(seller => ({
        id: seller.sellerId,
        name: seller.name,
      })),
      permissions: permissionsOptions.reduce((acc, current) => {
        acc[current.label] = current.value

        return acc
      }, {} as Record<string, boolean>),
    }

    updateOrganization({ variables })
      .then(() => {
        setLoadingState(false)
        showToast({
          variant: 'positive',
          message: formatMessage(messages.toastUpdateSuccess),
        })
        refetch({ id: params?.id })
      })
      .catch(error => {
        setLoadingState(false)
        console.error(error)
        showToast({
          variant: 'critical',
          message: formatMessage(messages.toastUpdateFailure),
        })
      })
  }

  const extractCollections = (
    data: any,
    orgCostCenterState: any
  ) => {
    if (!data?.getOrganizationById) return { collectionsOrg: [], collectionsCC: [] };

    // Extract collections from the organization
    const collectionsOrg =
      data.getOrganizationById.collections?.map(
        (collection: { name: string; id: string }) => ({
          name: collection.name,
          collectionId: collection.id,
        })
      ) ?? [];

    // Extract collections from the matched organization unit
    const matchedCollectionsCC =
      data?.getOrganizationById?.costCentersObj?.find(
        (center: any) => center.id === orgCostCenterState?.id
      )?.collections || [];

    const collectionsCC =
      matchedCollectionsCC.map(
        (collection: { name: string; id: string }) => ({
          name: collection.name,
          collectionId: collection.id,
        })
      ) ?? [];

    return { collectionsOrg, collectionsCC };
  };

  const getSchema = (type?: AvailabilityTypes) => {
    let cellRenderer

    switch (type) {
      case 'availablePriceTables':
        cellRenderer = ({
          rowData: { tableId, name },
        }: CellRendererProps<PriceTable>) => {
          const assigned = priceTablesState.includes(tableId)

          return (
            <span className={assigned ? 'c-disabled' : ''}>
              {name ?? tableId}
              {assigned && <IconCheck />}
            </span>
          )
        }

        break

      case 'availableCollections':
        cellRenderer = ({
          rowData: { name },
        }: CellRendererProps<Collection>) => {

          const assigned = collectionsState.some(
            collection => collection.name === name
          )

          return (
            <span className={assigned ? 'c-disabled' : ''}>
              {name}
              {assigned && <IconCheck />}
            </span>
          )
        }

        break

      case 'availablePayments':
        cellRenderer = ({
          rowData: { name },
        }: CellRendererProps<PaymentTerm>) => {
          const assigned = paymentTermsState.some(
            payment => payment.name === name
          )

          return (
            <span className={assigned ? 'c-disabled' : ''}>
              {name}
              {assigned && <IconCheck />}
            </span>
          )
        }

        break

      case 'availableSellers':
        cellRenderer = ({
          rowData: { sellerId, name },
        }: CellRendererProps<Seller>) => {
          const isDisabled = sellersState.some(
            seller => seller.sellerId === sellerId
          )

          return (
            <span className={isDisabled ? 'c-disabled' : ''}>
              {name ?? sellerId}
              {isDisabled && <IconCheck />}
            </span>
          )
        }

        break

      default:
        break
    }

    return {
      properties: {
        name: {
          title: formatMessage(messages.detailsColumnName),
          ...(cellRenderer && { cellRenderer }),
        },
      },
    }
  }

  /**
   * Effects
   */
  useEffect(() => {
    if (!data?.getOrganizationById) return

    const collectionsGroup = extractCollections(data, orgCostCenterState)
    const collections = isOrganizationView ? collectionsGroup?.collectionsOrg : collectionsGroup?.collectionsCC
    const paymentTerms =
      data.getOrganizationById.paymentTerms?.map(
        (paymentTerm: { name: string; id: string }) => {
          return { name: paymentTerm.name, paymentTermId: paymentTerm.id }
        }
      ) ?? []

    setOrganizationNameState(data.getOrganizationById.name)
    setOrganizationTradeNameState(data.getOrganizationById.tradeName ?? '')
    setStatusState(data.getOrganizationById.status)
    setCollectionsState(collections);
    setPaymentTermsState(paymentTerms)
    setPriceTablesState(data.getOrganizationById.priceTables ?? [])
    setSalesChannelState(data.getOrganizationById.salesChannel ?? '')
    setSellersState(
      data.getOrganizationById.sellers?.map(
        (seller: { id: string; name: string }) => ({
          sellerId: seller.id,
          name: seller.name,
        })
      ) ?? []
    )
  }, [data, orgCostCenterState])

  useEffect(() => {
    if(!costCenterData?.getCostCenterById?.organization) return
      const collectionsGroup = extractCollections(data, orgCostCenterState)
      const collections = isOrganizationView ? collectionsGroup?.collectionsOrg : collectionsGroup?.collectionsCC
      setCollectionsState(collections)
  }, [orgCostCenterState, costCenterData])

  useEffect(() => {
    const customFieldsToShow = joinById(
      data?.getOrganizationById?.customFields || [],
      defaultCustomFieldsData?.getB2BSettings?.organizationCustomFields || []
    )

    setCustomFieldsState(customFieldsToShow)
  }, [
    data &&
      defaultCustomFieldsData &&
      data?.getOrganizationById?.customFields &&
      defaultCustomFieldsData?.getB2BSettings.organizationCustomFields,
  ])

  /**
   * Data Variables
   */

  const tabsList = [
    {
      label: formatMessage(messages.default),
      tab: 'default',
      component: (
        <OrganizationDetailsDefault
          organizationNameState={organizationNameState}
          setOrganizationNameState={setOrganizationNameState}
          organizationTradeNameState={organizationTradeNameState}
          setOrganizationTradeNameState={setOrganizationTradeNameState}
          statusState={statusState}
          setStatusState={setStatusState}
          data={data}
          customFieldsState={customFieldsState}
          setCustomFieldsState={setCustomFieldsState}
        />
      ),
    },
    {
      label: formatMessage(messages.costCenters),
      tab: 'cost-centers',
      component: (
        <OrganizationDetailsCostCenters
          setLoadingState={setLoadingState}
          showToast={showToast}
          loadingState={loadingState}
        />
      ),
    },
    {
      label: formatMessage(messages.collections),
      tab: 'collections',
      component: (
        <OrganizationDetailsCollections
          getSchema={getSchema}
          collectionsState={collectionsState}
          setCollectionsState={setCollectionsState}
          orgCostCenterState={orgCostCenterState}
          setOrgCostCenterState={setOrgCostCenterState}
          isOrganizationView={isOrganizationView}
        />
      ),
    },
    {
      label: formatMessage(messages.paymentTerms),
      tab: 'pay-terms',

      component: (
        <OrganizationDetailsPayTerms
          getSchema={getSchema}
          paymentTermsState={paymentTermsState}
          setPaymentTermsState={setPaymentTermsState}
        />
      ),
    },
    {
      label: formatMessage(messages.priceTables),
      tab: 'price-tables',
      component: (
        <OrganizationDetailsPriceTables
          getSchema={getSchema}
          priceTablesState={priceTablesState}
          setPriceTablesState={setPriceTablesState}
        />
      ),
    },
    {
      label: formatMessage(messages.salesChannel),
      tab: 'sales-channel',
      component: (
        <OrganizationDetailsSalesChannel
          salesChannelState={salesChannelState}
          setSalesChannelState={setSalesChannelState}
        />
      ),
    },
    {
      label: formatMessage(messages.sellers),
      tab: 'sellers',
      component: (
        <OrganizationDetailsSellers
          getSchema={getSchema}
          sellersState={sellersState}
          setSellersState={setSellersState}
        />
      ),
    },
    {
      label: formatMessage(messages.users),
      tab: 'users',
      component: (
        <OrganizationDetailsUsers params={params} loadingState={loadingState} />
      ),
    },
    {
      label: formatMessage(messages.settings),
      tab: 'settings',
      component: (
        <OrganizationDetailsSettings
          permissionsOptions={permissionsOptions}
          setPermissionsOptions={setPermissionsOptions}
        />
      ),
    },
  ]

  const { tab, handleTabChange, routerRef } = useHashRouter({
    sessionKey: SESSION_STORAGE_KEY,
    defaultPath: 'default',
    routes: tabsList.map(_tab => _tab.tab),
  })

  return (
    <Layout
      fullWidth
      pageHeader={
        <PageHeader
          title={formatMessage(messages.detailsPageTitle)}
          linkLabel={formatMessage(messages.back)}
          onLinkClick={() => {
            navigate({
              page: 'admin.app.b2b-organizations.organizations',
            })
          }}
        >
          <Button
            variation="primary"
            isLoading={loadingState}
            onClick={() => manageOrgCostCenterUpdate()}
          >
            <FormattedMessage id="admin/b2b-organizations.organization-details.button.save" />
          </Button>
        </PageHeader>
      }
    >
      {loading ? (
        <PageBlock>
          <Spinner />
        </PageBlock>
      ) : (
        (data && (
          <HashRouter ref={routerRef}>
            <Tabs>
              {tabsList.map((item: { label: string; tab: string }) => (
                <Tab
                  label={item.label}
                  active={tab === item.tab}
                  onClick={() => handleTabChange(item.tab)}
                />
              ))}
            </Tabs>
            {errorState && errorState.length > 0 && (
              <Alert type="error" className="mt6 mb6">
                {errorState}
              </Alert>
            )}
            <Switch>
              {tabsList.map(({ tab: path, component }) => (
                <Route path={`/${path}`} key={path} exact>
                  <div className="mt6">{component}</div>
                </Route>
              ))}
            </Switch>
          </HashRouter>
        )) ?? (
          <PageBlock>
            <FormattedMessage id="admin/b2b-organizations.organization-details.empty-state" />
          </PageBlock>
        )
      )}
    </Layout>
  )
}

export default OrganizationDetails
